const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const pool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn(),
  _mockClient: mockClient,
};

module.exports = pool;
