/* https://graffino.com/til/hEvDjQa4au-how-to-import-images-in-typescript */

declare module '*.png' {
  const value: any;
  export = value;
}
