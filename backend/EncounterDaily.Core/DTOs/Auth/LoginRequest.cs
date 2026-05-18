using System.ComponentModel.DataAnnotations;

namespace EncounterDaily.Core.DTOs.Auth
{
    public class LoginRequest
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}
