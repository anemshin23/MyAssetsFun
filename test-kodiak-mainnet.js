#!/usr/bin/env node

// Test script for Kodiak API proxy with Berachain testnet
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BERACHAIN_MAINNET = {
  chainId: 80094,
  nativeToken: '0x0000000000000000000000000000000000000000', // ETH/BERA native
  usdc: '0x549943e04f40284185054145c6E4e9568C1D3241' // Mainnet USDC
};

async function testKodiakProxy() {
  console.log('🧪 Testing Kodiak API proxy with Berachain mainnet...\n');
  
  const testAmount = '1000000000000000000'; // 1 BERA in wei (18 decimals)
  
  const testParams = {
    tokenIn: BERACHAIN_MAINNET.nativeToken,
    tokenOut: BERACHAIN_MAINNET.usdc,
    amountIn: testAmount,
    slippageTolerance: 100, // 1% in basis points
    chainId: BERACHAIN_MAINNET.chainId
  };

  console.log('Test parameters:');
  console.log(`- Chain ID: ${BERACHAIN_MAINNET.chainId}`);
  console.log(`- Token In (BERA): ${testParams.tokenIn}`);
  console.log(`- Token Out (USDC): ${testParams.tokenOut}`);
  console.log(`- Amount In: ${testAmount} wei (1 BERA)`);
  console.log(`- Slippage: 1%\n`);

  try {
    console.log('🔄 Making request to proxy endpoint...');
    
    const startTime = Date.now();
    const response = await fetch('http://localhost:3002/api/kodiak/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testParams),
    });
    const endTime = Date.now();

    console.log(`⏱️  Response time: ${endTime - startTime}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('❌ Request failed');
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Proxy response received:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      const data = result.data;
      console.log('\n📈 Quote Summary:');
      console.log(`- Amount Out: ${data.amountOut} (raw)`);
      
      // Convert USDC amount (6 decimals) to human readable
      if (data.amountOut) {
        const usdcAmount = Number(data.amountOut) / 1000000; // USDC has 6 decimals
        console.log(`- Amount Out: ${usdcAmount.toFixed(6)} USDC`);
        console.log(`- Exchange Rate: 1 BERA = ${usdcAmount.toFixed(2)} USDC`);
      }
      
      if (data.priceImpact) {
        console.log(`- Price Impact: ${data.priceImpact}%`);
      }
      
      if (data.route) {
        console.log(`- Route: ${data.route.length} hop(s)`);
      }

      console.log('\n🎉 Kodiak proxy test PASSED!');
    } else {
      console.error('❌ Proxy returned unsuccessful response');
      console.error('Result:', result);
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    console.error('\nPossible issues:');
    console.error('1. Server not running (start with: npm run start)');
    console.error('2. Network connectivity issues');
    console.error('3. Kodiak API is down or rate limiting');
  }
}

// Run the test
testKodiakProxy();