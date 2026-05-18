using EncounterDaily.API.Controllers;
using EncounterDaily.Core.Entities;
using EncounterDaily.Core.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EncounterDaily.Tests.UnitTests.Controllers
{
    [Trait("Category", "Unit")]
    public class BaseControllerTests
    {
        private readonly Mock<IService<Book>> _mockService;
        private readonly TestBookController _controller;

        public BaseControllerTests()
        {
            _mockService = new Mock<IService<Book>>();
            _controller = new TestBookController(_mockService.Object);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOkWithEntities()
        {
            var books = new List<Book> { new Book { Id = 1, Title = "Book 1" } };
            _mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(books);

            var result = await _controller.GetAll();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as IEnumerable<Book>;
            value.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOkWithEmptyList_WhenNoEntities()
        {
            _mockService.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<Book>());

            var result = await _controller.GetAll();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as IEnumerable<Book>;
            value.Should().BeEmpty();
        }

        [Fact]
        public async Task GetById_ShouldReturnOk_WhenEntityFound()
        {
            var book = new Book { Id = 1, Title = "Found" };
            _mockService.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(book);

            var result = await _controller.GetById(1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);
            var value = okResult.Value as Book;
            value!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetById_ShouldReturnNotFound_WhenEntityMissing()
        {
            _mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((Book?)null);

            var result = await _controller.GetById(999);

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task Create_ShouldReturnCreatedAtAction()
        {
            var book = new Book { Title = "New Book" };
            var created = new Book { Id = 1, Title = "New Book" };
            _mockService.Setup(s => s.AddAsync(book)).ReturnsAsync(created);

            var result = await _controller.Create(book);

            var createdResult = result.Result as CreatedAtActionResult;
            createdResult.Should().NotBeNull();
            createdResult!.StatusCode.Should().Be(201);
            createdResult.ActionName.Should().Be(nameof(BaseController<Book>.GetById));
            createdResult.RouteValues.Should().ContainKey("id");
            createdResult.RouteValues!["id"].Should().Be(1);
        }

        [Fact]
        public async Task Update_ShouldReturnNoContent_WhenSuccessful()
        {
            var book = new Book { Id = 1, Title = "Updated" };

            var result = await _controller.Update(1, book);

            result.Should().BeOfType<NoContentResult>();
            var noContent = result as NoContentResult;
            noContent!.StatusCode.Should().Be(204);
        }

        [Fact]
        public async Task Update_ShouldReturnBadRequest_WhenIdMismatch()
        {
            var book = new Book { Id = 2, Title = "Mismatch" };

            var result = await _controller.Update(1, book);

            result.Should().BeOfType<BadRequestResult>();
            _mockService.Verify(s => s.UpdateAsync(It.IsAny<Book>()), Times.Never);
        }

        [Fact]
        public async Task Delete_ShouldReturnNoContent_WhenEntityExists()
        {
            var book = new Book { Id = 1, Title = "To Delete" };
            _mockService.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(book);

            var result = await _controller.Delete(1);

            result.Should().BeOfType<NoContentResult>();
            var noContent = result as NoContentResult;
            noContent!.StatusCode.Should().Be(204);
            _mockService.Verify(s => s.DeleteAsync(1), Times.Once);
        }

        [Fact]
        public async Task Delete_ShouldReturnNotFound_WhenEntityMissing()
        {
            _mockService.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((Book?)null);

            var result = await _controller.Delete(999);

            result.Should().BeOfType<NotFoundResult>();
            _mockService.Verify(s => s.DeleteAsync(It.IsAny<int>()), Times.Never);
        }

        private class TestBookController : BaseController<Book>
        {
            public TestBookController(IService<Book> service) : base(service) { }
        }
    }
}
