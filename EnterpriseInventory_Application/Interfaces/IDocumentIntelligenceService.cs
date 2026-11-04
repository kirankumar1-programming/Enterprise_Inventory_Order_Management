using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using EnterpriseInventory_Application.DTOs;

namespace EnterpriseInventory_Application.Interfaces;

public interface IDocumentIntelligenceService
{
    Task<ExtractedOrderDocumentDto> IngestDocumentAsync(Stream fileStream, string fileName, string contentType, int? preferredWarehouseId = null);
    Task<ExtractedOrderDocumentDto> IngestSampleDocumentAsync(string sampleId, int? preferredWarehouseId = null);
    IEnumerable<SampleDocumentOptionDto> GetSampleDocuments();
}
