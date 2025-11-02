import { ContractFunctionParameters } from "@hashgraph/sdk";

// Purpose: Helper class to build contract function parameters for smart contract calls
// Example usage:
// const params = new ContractFunctionParameterBuilder()
//   .addParam({ type: "address", name: "token", value: tokenAddress })
//   .addParam({ type: "uint256", name: "amount", value: amount });

export class ContractFunctionParameterBuilder {
  constructor() {
    this.params = [];
  }

  addParam(param) {
    this.params.push(param);
    return this;
  }

  // Build Hedera API parameters
  buildHAPIParams() {
    const constructorParams = new ContractFunctionParameters();
    this.params.forEach((param) => {
      switch (param.type) {
        case "address":
          constructorParams.addAddress(param.value);
          break;
        case "uint256":
          constructorParams.addUint256(param.value);
          break;
        case "string":
          constructorParams.addString(param.value);
          break;
        case "bool":
          constructorParams.addBool(param.value);
          break;
        case "uint8":
          constructorParams.addUint8(param.value);
          break;
        case "uint32":
          constructorParams.addUint32(param.value);
          break;
        case "uint64":
          constructorParams.addUint64(param.value);
          break;
        case "int256":
          constructorParams.addInt256(param.value);
          break;
        case "bytes":
          constructorParams.addBytes(param.value);
          break;
        default:
          throw new Error(`Unsupported parameter type: ${param.type}`);
      }
    });
    return constructorParams;
  }
}
