using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

using EnterpriseInventory_Application.Interfaces;
using EnterpriseInventory.Core.Entities;
using EnterpriseInventory.Core.Exceptions;
using EnterpriseInventory.Core.Interfaces;
using EnterpriseInventory_Application.DTOs;


namespace EnterpriseInventory_Application.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
        Task<UserDto> GetCurrentUserAsync();
        Task<IEnumerable<UserDto>> GetAllUsersAsync();
    }

    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;
        private readonly ICurrentUserService _currentUserService;

        public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration, ICurrentUserService currentUserService)
        {
            _unitOfWork = unitOfWork;
            _configuration = configuration;
            _currentUserService = currentUserService;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !user.IsActive)
            {
                throw new AppException("Invalid username or password.", 401);
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                throw new AppException("Invalid username or password.", 401);
            }

            var (token, expiresAt) = GenerateJwtToken(user);

            // Audit login
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                EntityName = "User",
                EntityId = user.Id.ToString(),
                Action = "UserLogin",
                UserId = user.Id,
                UserEmail = user.Email,
                ChangesJson = "{\"status\":\"Success\"}",
                Timestamp = DateTime.UtcNow,
                IpAddress = _currentUserService.IpAddress
            });
            await _unitOfWork.SaveChangesAsync();

            return new LoginResponseDto
            {
                Token = token,
                ExpiresAt = expiresAt,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    FullName = user.FullName,
                    Role = user.Role.Name,
                    IsActive = user.IsActive
                }
            };
        }

        public async Task<UserDto> GetCurrentUserAsync()
        {
            if (!_currentUserService.UserId.HasValue)
            {
                throw new AppException("User is not authenticated.", 401);
            }

            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId.Value);

            if (user == null)
            {
                throw new NotFoundException("User", _currentUserService.UserId.Value);
            }

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.Name,
                IsActive = user.IsActive
            };
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var users = await _unitOfWork.Users.Query()
                .Include(u => u.Role)
                .OrderBy(u => u.FullName)
                .ToListAsync();

            return users.Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role.Name,
                IsActive = u.IsActive
            });
        }

        private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var secretKey = jwtSettings["Key"] ?? "SuperEnterpriseInventorySecretKeyWithAtLeast32BytesLength!";
            var issuer = jwtSettings["Issuer"] ?? "EnterpriseInventoryApi";
            var audience = jwtSettings["Audience"] ?? "EnterpriseInventoryClient";
            var expiryMinutes = int.TryParse(jwtSettings["DurationInMinutes"], out var minutes) ? minutes : 720; // 12 hours

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

            var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.Name),
            new("FullName", user.FullName)
        };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expiresAt,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var securityToken = tokenHandler.CreateToken(tokenDescriptor);
            var token = tokenHandler.WriteToken(securityToken);

            return (token, expiresAt);
        }
    }