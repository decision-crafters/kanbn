const KanbnError = require('../../src/errors/KanbnError');
const {
  AiError,
  ProviderUnavailableError,
  RateLimitError,
  ServiceError,
  normaliseAiError
} = require('../../src/errors/AiError');

describe('custom error classes', () => {
  test('KanbnError stores message and context', () => {
    const err = new KanbnError('oops', { code: 'E_TEST', detail: 42 });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('KanbnError');
    expect(err.message).toBe('oops');
    expect(err.context).toEqual({ code: 'E_TEST', detail: 42 });
  });

  test('AiError subclasses retain name and message', () => {
    const err = new ProviderUnavailableError('down');
    expect(err).toBeInstanceOf(AiError);
    expect(err.name).toBe('ProviderUnavailableError');
    expect(err.message).toBe('down');
  });

  test('normaliseAiError maps rate limit messages', () => {
    const e = normaliseAiError(new Error('Rate limit exceeded'));
    expect(e).toBeInstanceOf(RateLimitError);
  });

  test('normaliseAiError maps connectivity messages', () => {
    const e = normaliseAiError(new Error('Connection refused'));
    expect(e).toBeInstanceOf(ProviderUnavailableError);
  });

  test('normaliseAiError defaults to ServiceError', () => {
    const e = normaliseAiError(new Error('Something else'));
    expect(e).toBeInstanceOf(ServiceError);
  });
});
