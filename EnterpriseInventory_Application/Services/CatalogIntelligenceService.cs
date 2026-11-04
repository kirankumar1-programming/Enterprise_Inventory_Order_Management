using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Interfaces;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventory_Application.Services;

public class CatalogIntelligenceService : ICatalogIntelligenceService
{
    private readonly IUnitOfWork _unitOfWork;

    public CatalogIntelligenceService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<DuplicateCheckResponseDto> DetectDuplicatesAsync(DuplicateCheckRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) && string.IsNullOrWhiteSpace(request.SKU))
        {
            return new DuplicateCheckResponseDto { HasLikelyDuplicates = false };
        }

        var normalizedReqName = NormalizeString(request.Name);
        var normalizedReqSku = NormalizeSku(request.SKU ?? string.Empty);
        var reqTokens = Tokenize(normalizedReqName);

        var existingProducts = await _unitOfWork.Products.Query()
            .Include(p => p.Category)
            .Where(p => p.IsActive && (!request.CurrentProductId.HasValue || p.Id != request.CurrentProductId.Value))
            .ToListAsync();

        var matches = new List<DuplicateProductMatchDto>();

        foreach (var p in existingProducts)
        {
            var pNormName = NormalizeString(p.Name);
            var pNormSku = NormalizeSku(p.SKU);
            var pTokens = Tokenize(pNormName);

            double score = 0.0;
            var reasons = new List<string>();

            // 1. Exact or near-exact SKU match
            if (!string.IsNullOrEmpty(normalizedReqSku) && normalizedReqSku == pNormSku)
            {
                score = 1.0;
                reasons.Add("Identical SKU code");
            }
            else if (!string.IsNullOrEmpty(normalizedReqSku) && (normalizedReqSku.Contains(pNormSku) || pNormSku.Contains(normalizedReqSku)))
            {
                score = Math.Max(score, 0.85);
                reasons.Add("Very similar SKU prefix/suffix");
            }

            // 2. Exact name match
            if (normalizedReqName == pNormName)
            {
                score = 1.0;
                reasons.Add("Exact product title match");
            }
            else
            {
                // 3. Jaccard token overlap
                var intersection = reqTokens.Intersect(pTokens).Count();
                var union = reqTokens.Union(pTokens).Count();
                var jaccard = union > 0 ? (double)intersection / union : 0;

                if (jaccard >= 0.5)
                {
                    var tokenScore = Math.Round(jaccard * 0.9, 2);
                    if (tokenScore > score)
                    {
                        score = tokenScore;
                        reasons.Add($"Shares {intersection} key descriptive keywords ({Math.Round(jaccard * 100)}% token overlap)");
                    }
                }

                // 4. Substring containment
                if (normalizedReqName.Length > 6 && pNormName.Length > 6)
                {
                    if (normalizedReqName.Contains(pNormName) || pNormName.Contains(normalizedReqName))
                    {
                        score = Math.Max(score, 0.78);
                        reasons.Add("One title is a direct subset of the other");
                    }
                }
            }

            if (score >= 0.60)
            {
                matches.Add(new DuplicateProductMatchDto
                {
                    ProductId = p.Id,
                    SKU = p.SKU,
                    Name = p.Name,
                    CategoryName = p.Category?.Name ?? "Unassigned",
                    Price = p.Price,
                    SimilarityScore = Math.Round(score, 2),
                    MatchReason = string.Join(", ", reasons)
                });
            }
        }

        var orderedMatches = matches.OrderByDescending(m => m.SimilarityScore).Take(5).ToList();

        return new DuplicateCheckResponseDto
        {
            HasLikelyDuplicates = orderedMatches.Any(m => m.SimilarityScore >= 0.70),
            Matches = orderedMatches
        };
    }

    public async Task<CategorySuggestionDto?> SuggestCategoryAsync(SuggestCategoryRequestDto request)
    {
        var categories = await _unitOfWork.Categories.Query()
            .Include(c => c.Products)
            .ToListAsync();

        if (!categories.Any())
        {
            return null;
        }

        var textToAnalyze = $"{request.Name} {request.Description ?? string.Empty}".ToLowerInvariant();
        var tokens = Tokenize(textToAnalyze);

        Category? bestCategory = null;
        double bestScore = 0.0;
        string bestReason = string.Empty;

        foreach (var category in categories)
        {
            double score = 0.0;
            var catNameLower = category.Name.ToLowerInvariant();
            var catCodeLower = category.Code.ToLowerInvariant();

            // Direct category name match
            if (textToAnalyze.Contains(catNameLower))
            {
                score += 0.60;
            }
            if (textToAnalyze.Contains(catCodeLower) && catCodeLower.Length > 2)
            {
                score += 0.30;
            }

            // Check overlap with existing products in this category
            var categoryProductWords = category.Products
                .SelectMany(p => Tokenize(p.Name.ToLowerInvariant()))
                .Distinct()
                .ToHashSet();

            var commonWords = tokens.Intersect(categoryProductWords).Count();
            if (commonWords > 0)
            {
                score += Math.Min(0.40, commonWords * 0.10);
            }

            if (score > bestScore)
            {
                bestScore = score;
                bestCategory = category;
                bestReason = $"Matched keywords against category '{category.Name}' ({category.Code}) and existing catalog items";
            }
        }

        if (bestCategory == null || bestScore < 0.20)
        {
            // Default to first category if confidence is minimal
            var fallback = categories.First();
            return new CategorySuggestionDto
            {
                CategoryId = fallback.Id,
                CategoryName = fallback.Name,
                ConfidenceScore = 0.30,
                Explanation = "General catalog classification suggestion"
            };
        }

        return new CategorySuggestionDto
        {
            CategoryId = bestCategory.Id,
            CategoryName = bestCategory.Name,
            ConfidenceScore = Math.Min(0.98, Math.Round(bestScore, 2)),
            Explanation = bestReason
        };
    }

    public async Task<CatalogAuditReportDto> GetCatalogAuditReportAsync()
    {
        var products = await _unitOfWork.Products.Query()
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .ToListAsync();

        var categories = await _unitOfWork.Categories.Query().ToListAsync();

        var duplicatePairs = new List<CatalogDuplicatePairDto>();
        var misclassifications = new List<CategoryMisclassificationAlertDto>();

        // 1. Pairwise deduplication scan
        for (int i = 0; i < products.Count; i++)
        {
            var p1 = products[i];
            var normName1 = NormalizeString(p1.Name);
            var normSku1 = NormalizeSku(p1.SKU);
            var tokens1 = Tokenize(normName1);

            for (int j = i + 1; j < products.Count; j++)
            {
                var p2 = products[j];
                var normName2 = NormalizeString(p2.Name);
                var normSku2 = NormalizeSku(p2.SKU);
                var tokens2 = Tokenize(normName2);

                double pairScore = 0.0;
                var reasons = new List<string>();

                if (!string.IsNullOrEmpty(normSku1) && normSku1 == normSku2)
                {
                    pairScore = 1.0;
                    reasons.Add("Identical SKU code");
                }
                else if (!string.IsNullOrEmpty(normSku1) && (normSku1.Contains(normSku2) || normSku2.Contains(normSku1)))
                {
                    pairScore = Math.Max(pairScore, 0.85);
                    reasons.Add("Overlapping SKU identifier");
                }

                if (normName1 == normName2)
                {
                    pairScore = 1.0;
                    reasons.Add("Identical product title");
                }
                else
                {
                    var inter = tokens1.Intersect(tokens2).Count();
                    var un = tokens1.Union(tokens2).Count();
                    var jaccard = un > 0 ? (double)inter / un : 0;
                    if (jaccard >= 0.45)
                    {
                        var jaccardScore = Math.Round(jaccard * 0.95, 2);
                        if (jaccardScore > pairScore)
                        {
                            pairScore = jaccardScore;
                            reasons.Add($"High token overlap ({Math.Round(jaccard * 100)}% descriptive keywords match)");
                        }
                    }

                    if (normName1.Length > 6 && normName2.Length > 6 && (normName1.Contains(normName2) || normName2.Contains(normName1)))
                    {
                        pairScore = Math.Max(pairScore, 0.78);
                        reasons.Add("One title is a direct subset of the other");
                    }
                }

                if (pairScore >= 0.60)
                {
                    duplicatePairs.Add(new CatalogDuplicatePairDto
                    {
                        ProductAId = p1.Id,
                        ProductASku = p1.SKU,
                        ProductAName = p1.Name,
                        ProductACategory = p1.Category?.Name ?? "Unassigned",
                        ProductAPrice = p1.Price,
                        ProductBId = p2.Id,
                        ProductBSku = p2.SKU,
                        ProductBName = p2.Name,
                        ProductBCategory = p2.Category?.Name ?? "Unassigned",
                        ProductBPrice = p2.Price,
                        SimilarityScore = Math.Round(pairScore, 2),
                        SimilarityReason = string.Join("; ", reasons)
                    });
                }
            }

            // 2. Anomaly detection: Category mismatch check
            var suggestedCat = await SuggestCategoryAsync(new SuggestCategoryRequestDto
            {
                Name = p1.Name,
                Description = p1.Description
            });

            if (suggestedCat != null && suggestedCat.ConfidenceScore >= 0.75 && suggestedCat.CategoryId != p1.CategoryId)
            {
                misclassifications.Add(new CategoryMisclassificationAlertDto
                {
                    ProductId = p1.Id,
                    Sku = p1.SKU,
                    ProductName = p1.Name,
                    CurrentCategory = p1.Category?.Name ?? "Unassigned",
                    SuggestedCategory = suggestedCat.CategoryName,
                    Confidence = suggestedCat.ConfidenceScore,
                    Reason = suggestedCat.Explanation
                });
            }
        }

        int scorePenalty = (duplicatePairs.Count * 6) + (misclassifications.Count * 4);
        int qualityScore = Math.Clamp(100 - scorePenalty, 40, 100);

        return new CatalogAuditReportDto
        {
            TotalProductsScanned = products.Count,
            PotentialDuplicatePairsCount = duplicatePairs.Count,
            CategoryAnomaliesCount = misclassifications.Count,
            CatalogQualityScore = qualityScore,
            ScanTimestamp = DateTime.UtcNow,
            DuplicatePairs = duplicatePairs.OrderByDescending(d => d.SimilarityScore).ToList(),
            MisclassificationAlerts = misclassifications
        };
    }

    private static string NormalizeString(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var lower = text.ToLowerInvariant();
        return Regex.Replace(lower, @"[^a-z0-9\s]", " ").Trim();
    }

    private static string NormalizeSku(string sku)
    {
        if (string.IsNullOrWhiteSpace(sku)) return string.Empty;
        return Regex.Replace(sku.ToLowerInvariant(), @"[^a-z0-9]", "");
    }

    private static HashSet<string> Tokenize(string text)
    {
        var stopWords = new HashSet<string> { "and", "the", "with", "for", "in", "of", "to", "a", "an", "on", "by" };
        var words = text.Split(new[] { ' ', '-', '_', '/', '\\', ',' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim().ToLowerInvariant())
            .Where(w => w.Length > 1 && !stopWords.Contains(w));
        return new HashSet<string>(words);
    }
}
