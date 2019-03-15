export class DomainNormalizer {
  public static normalize(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/ /g, "")
      .trim();
  }
}
