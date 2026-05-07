afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

afterAll(async () => {
  jest.useRealTimers();
  await new Promise((r) => setTimeout(r, 500));
});
