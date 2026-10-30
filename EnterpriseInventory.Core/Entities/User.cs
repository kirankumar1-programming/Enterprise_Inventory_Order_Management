using System;
using System.Collections.Generic;
using System.Text;

namespace EnterpriseInventory.Core.Entities
{
    public class Role
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<User> Users { get; set; } = new List<User>();
    }

    public class User : BaseEntity
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;

        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;
    }

}