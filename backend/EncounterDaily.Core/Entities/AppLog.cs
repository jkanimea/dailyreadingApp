using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.Entities
{
    public class AppLog : BaseEntity
    {
        [Required]
        [MaxLength(20)]
        public string Level { get; set; } = "info";

        [Required]
        public string Message { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Source { get; set; }

        public string? Exception { get; set; }

        public int? UserId { get; set; }

        [MaxLength(255)]
        public string? UserEmail { get; set; }

        [MaxLength(50)]
        public string? IpAddress { get; set; }

        [Required]
        [MaxLength(20)]
        public string Origin { get; set; } = "client"; // "client" or "server"
    }
}
