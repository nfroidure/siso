type SisoValue = any;
type SisoParamValue = string | number | boolean;
type SisoPattern = {
  name: string;
  pattern?: string;
  enum: SisoParamValue[];
  type: 'string' | 'number' | 'boolean';
};
type SisoNode = string;
type SisoParameter = SisoNode | SisoPattern;

declare class Siso<V = SisoValue> {
  constructor();
  register(pathPatternNodes: SisoParameter[], value: V): void;
  find(
    pathNodes: SisoNode[],
  ): [
    V,
    {
      [name: string]: SisoParamValue;
    }
  ];
}

export default Siso;
