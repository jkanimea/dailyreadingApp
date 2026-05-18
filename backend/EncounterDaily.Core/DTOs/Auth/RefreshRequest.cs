using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.DTOs.Auth
{
    public class RefreshRequest
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
