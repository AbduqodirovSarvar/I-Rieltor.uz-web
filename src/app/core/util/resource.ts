/**
 * The value of a resource, or `undefined` while it has none. Reading `value()` of a resource that is in an error state THROWS;
 * a template that did that would take the whole page down when one call fails. Use this instead.
 */
export function valueOf<T>(resource: { hasValue(): boolean; value(): T }): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}
