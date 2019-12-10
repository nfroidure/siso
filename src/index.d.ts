type SisoValue = unknown;
type SisoParamValue = string | number | boolean;
type SisoPattern = {
  name: string;
  pattern?: string;
  enum: SisoParamValue[];
  type: 'string' | 'number' | 'boolean';
};
type SisoNode = string;
type SisoParameter = SisoNode | SisoPattern;

declare class Siso<V = SisoValue, P = SisoParamValue> {
  constructor();
  register(pathPatternNodes: SisoParameter[], value: V): void;
  find(
    pathNodes: SisoNode[],
  ): [
    V,
    {
      [name: string]: P;
    }
  ];
}

export default Siso;
