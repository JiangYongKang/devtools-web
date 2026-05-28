import { describe, expect, test } from 'vitest'
import {
  parseBigInt,
  add,
  sub,
  mul,
  mod,
  pow,
  modPow,
  gcd,
  extendedGcd,
  modInverse,
  compare,
  abs,
  min,
  max,
} from '../logic/bigint.js'

describe('BigInt 运算模块', () => {
  describe('parseBigInt', () => {
    it('解析十进制字符串', () => {
      expect(parseBigInt('123456789012345678901234567890')).toBe(123456789012345678901234567890n)
    })

    it('解析十六进制字符串', () => {
      expect(parseBigInt('0xFF')).toBe(255n)
      expect(parseBigInt('0X1A3')).toBe(419n)
    })

    it('解析负数', () => {
      expect(parseBigInt('-123')).toBe(-123n)
    })

    it('抛出错误当格式无效时', () => {
      expect(() => parseBigInt('123.45')).toThrow()
      expect(() => parseBigInt('abc')).toThrow()
    })
  })

  describe('基本运算', () => {
    it('加法运算', () => {
      expect(add('123', '456')).toBe(579n)
      expect(add('-100', '200')).toBe(100n)
    })

    it('减法运算', () => {
      expect(sub('456', '123')).toBe(333n)
      expect(sub('100', '200')).toBe(-100n)
    })

    it('乘法运算', () => {
      expect(mul('123', '456')).toBe(56088n)
      expect(mul('-12', '34')).toBe(-408n)
    })
  })

  describe('模运算', () => {
    it('正整数取模', () => {
      expect(mod('17', '5')).toBe(2n)
    })

    it('负数取模 - 结果符号与除数相同', () => {
      expect(mod('-17', '5')).toBe(3n)
      expect(mod('17', '-5')).toBe(-3n)
      expect(mod('-17', '-5')).toBe(-2n)
    })

    it('除零错误', () => {
      expect(() => mod('10', '0')).toThrow('除零错误')
    })
  })

  describe('幂运算', () => {
    it('正整数幂', () => {
      expect(pow('2', '10')).toBe(1024n)
      expect(pow('3', '5')).toBe(243n)
    })

    it('大指数运算', () => {
      expect(pow('2', '64')).toBe(18446744073709551616n)
    })

    it('负指数抛出错误', () => {
      expect(() => pow('2', '-3')).toThrow()
    })
  })

  describe('模幂运算', () => {
    it('基本模幂', () => {
      expect(modPow('2', '10', '1000')).toBe(24n)
    })

    it('RSA 风格模幂', () => {
      expect(modPow('123456789', '65537', '999999937')).toBe(900618501n)
    })

    it('模为 1 时结果为 0', () => {
      expect(modPow('123', '456', '1')).toBe(0n)
    })
  })

  describe('最大公约数', () => {
    it('gcd 基本运算', () => {
      expect(gcd('48', '18')).toBe(6n)
      expect(gcd('100', '25')).toBe(25n)
    })

    it('负数 gcd', () => {
      expect(gcd('-48', '18')).toBe(6n)
    })

    it('gcd 为 1（互质）', () => {
      expect(gcd('17', '13')).toBe(1n)
    })
  })

  describe('扩展欧几里得算法', () => {
    it('ax + by = gcd(a, b)', () => {
      const result = extendedGcd('35', '15')
      expect(result.gcd).toBe(5n)
      expect(35n * result.x + 15n * result.y).toBe(5n)
    })
  })

  describe('模逆元', () => {
    it('存在逆元时', () => {
      const inv = modInverse('3', '7')
      expect((3n * inv) % 7n).toBe(1n)
    })

    it('不存在逆元时抛出错误', () => {
      expect(() => modInverse('6', '9')).toThrow()
    })
  })

  describe('比较运算', () => {
    it('compare 函数', () => {
      expect(compare('100', '200')).toBe(-1)
      expect(compare('200', '100')).toBe(1)
      expect(compare('150', '150')).toBe(0)
    })

    it('abs 函数', () => {
      expect(abs('-123')).toBe(123n)
      expect(abs('123')).toBe(123n)
    })

    it('min/max 函数', () => {
      expect(min('5', '3', '9', '1')).toBe(1n)
      expect(max('5', '3', '9', '1')).toBe(9n)
    })
  })
})
