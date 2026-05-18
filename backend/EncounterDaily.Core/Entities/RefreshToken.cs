using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class RefreshToken : BaseEntity
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Token { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public bool IsRevoked { get; set; }

        public DateTime? RevokedAt { get; set; }

        [MaxLength(500)]
        public string? ReplacedByToken { get; set; }

        public int ReuseCount { get; set; }
    }
}
