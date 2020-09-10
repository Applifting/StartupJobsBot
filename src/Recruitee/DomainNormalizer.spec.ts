import { DomainNormalizer } from './DomainNormalizer';

describe('DomainNormalizer', () => {
  it('Normalizes domain - removes dots', () => {
    expect(DomainNormalizer.normalize('Applifting s.r.o.')).toEqual('appliftingsro');
  });

  it('Normalizes domain - removes spaces', () => {
    expect(DomainNormalizer.normalize('j o b s')).toEqual('jobs');
  });

  it('Normalizes domain - converts to lowercase', () => {
    expect(DomainNormalizer.normalize('ACME')).toEqual('acme');
  });
});
