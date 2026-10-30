using System;
using System.Collections.Generic;
using System.Text;

namespace EnterpriseInventory_Application.Interfaces
{

    public interface ICurrentUserService
    {
        int? UserId { get; }
        string? Username { get; }
        string? UserEmail { get; }
        string? Role { get; }
        string? IpAddress { get; }
    }
}
