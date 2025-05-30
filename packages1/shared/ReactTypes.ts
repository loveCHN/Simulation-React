export type Type = any;
export type Key = any;
export type Props = any;
export type Ref = any;
export interface ReactElementType {
  $$typeof: symbol | number;
  key: Key;
  props: Props;
  type: ElementType;
  ref: Ref;
  __mark: string;
}
export type ElementType = any;
export type Action<State> = State | ((prevState: State) => State);
