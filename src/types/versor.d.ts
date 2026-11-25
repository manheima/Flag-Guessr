declare module 'versor' {
  type Quaternion = [number, number, number, number];
  type Rotation = [number, number, number];
  type Point = [number, number];

  interface Versor {
    (e?: Rotation): Quaternion;
    cartesian(e: Point): [number, number, number];
    rotation(q: Quaternion): Rotation;
    delta(v0: [number, number, number], v1: [number, number, number], alpha?: number): Quaternion;
    multiply(a: Quaternion, b: Quaternion): Quaternion;
    interpolate(a: Rotation, b: Rotation): (t: number) => Rotation;
  }

  const versor: Versor;
  export default versor;
}
