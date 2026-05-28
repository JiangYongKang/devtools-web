/**
 * 内置示例
 */

export const EXAMPLES = [
  {
    id: 'fibonacci-1000',
    name: '斐波那契 1000',
    description: '计算第 1000 个斐波那契数，演示 BigInt 大数能力',
    expression: 'fib(1000)',
    type: 'expression',
  },
  {
    id: '0.1-plus-0.2',
    name: '0.1 + 0.2',
    description: '经典浮点数精度问题，对比三种模式结果',
    expression: '0.1 + 0.2',
    type: 'expression',
  },
  {
    id: 'rsa-modpow',
    name: 'RSA 模幂',
    description: 'RSA 加密演示：m^e mod n，小指数 e=65537',
    expression: 'modpow(123456789, 65537, 999999937)',
    type: 'expression',
  },
]

export function computeFibonacci(n) {
  if (n === 0) return 0n
  if (n === 1) return 1n

  let a = 0n
  let b = 1n

  for (let i = 2; i <= n; i++) {
    const temp = a + b
    a = b
    b = temp
  }

  return b
}

export function generateFibonacciExpression(n) {
  return `Fibonacci(${n})`
}
