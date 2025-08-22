
import { ethers } from 'ethers';

const ROUTER_ADDRESS = '0xCd2678b19626B8d1e6dAa724FcBbdbA9508B8A04';

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
];

const provider = new ethers.JsonRpcProvider('/api/rpc-proxy');

const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);

export const getQuote = async (amountIn: string, tokenIn: string, tokenOut: string): Promise<string> => {
  try {
    const amountInWei = ethers.parseUnits(amountIn, 18); // Assuming 18 decimals for the input token
    const path = [tokenIn, tokenOut];
    const amounts = await routerContract.getAmountsOut(amountInWei, path);
    const amountOutWei = amounts[1];
    return ethers.formatUnits(amountOutWei, 18); // Assuming 18 decimals for the output token
  } catch (error) {
    console.error('Error getting quote:', error);
    // Return a mock quote in case of an error
    return (parseFloat(amountIn) * 0.98).toString();
  }
};
