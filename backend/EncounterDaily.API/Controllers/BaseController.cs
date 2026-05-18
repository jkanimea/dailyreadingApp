using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace EncounterDaily.API.Controllers
{
    [ApiController]
    public abstract class BaseController<T> : ControllerBase where T : BaseEntity
    {
        protected readonly IService<T> _service;

        protected BaseController(IService<T> service)
        {
            _service = service;
        }

        [HttpGet]
        public virtual async Task<ActionResult<IEnumerable<T>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public virtual async Task<ActionResult<T>> GetById(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public virtual async Task<ActionResult<T>> Create([FromBody] T entity)
        {
            var created = await _service.AddAsync(entity);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public virtual async Task<IActionResult> Update(int id, [FromBody] T entity)
        {
            if (id != entity.Id)
                return BadRequest();
            await _service.UpdateAsync(entity);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public virtual async Task<IActionResult> Delete(int id)
        {
            var entity = await _service.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
