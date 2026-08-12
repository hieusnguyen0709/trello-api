import { OBJECT_ID_RULE, EMAIL_RULE, PASSWORD_RULE } from '~/utils/validators'

describe('OBJECT_ID_RULE', () => {
    it('Match a valid 24-character hex string', () => {
        expect(OBJECT_ID_RULE.test('507f1f77bcf86cd799439011')).toBe(true)
    })

    it('Match uppercase hex characters as well', () => {
        expect(OBJECT_ID_RULE.test('507F1F77BCF86CD799439011')).toBe(true)
    })

    it('Reject a string shorter than 24 characters', () => {
        expect(OBJECT_ID_RULE.test('507f1f77bcf86cd79943901')).toBe(false)
    })

    it('Reject a string longer than 24 characters', () => {
        expect(OBJECT_ID_RULE.test('507f1f77bcf86cd7994390111')).toBe(false)
    })

    it('Reject a string containing non-hex characters', () => {
        expect(OBJECT_ID_RULE.test('507f1f77bcf86cd79943901g')).toBe(false)
    })
})

describe('EMAIL_RULE', () => {
    it('Match a valid email format', () => {
        expect(EMAIL_RULE.test('hieunm@gmail.com')).toBe(true)
    })

    it('Reject a string without @', () => {
        expect(EMAIL_RULE.test('hieunmgmail.com')).toBe(false)
    })

    it('Reject a string without a domain dot', () => {
        expect(EMAIL_RULE.test('hieunm@gmailcom')).toBe(false)
    })

    it('Reject a string containing whitespace', () => {
        expect(EMAIL_RULE.test('hieunm @gmail.com')).toBe(false)
    })

    it('Incorrectly accepts a string with two @ symbols', () => {
        expect(EMAIL_RULE.test('a@b@c.com')).toBe(true)
    })
})

describe('PASSWORD_RULE', () => {
    it('Match a valid password with letters, a digit, and at least 8 characters', () => {
        expect(PASSWORD_RULE.test('abc12345')).toBe(true)
    })

    it('Reject a password without any digit', () => {
        expect(PASSWORD_RULE.test('abcdefgh')).toBe(false)
    })

    it('Reject a password without any letter', () => {
        expect(PASSWORD_RULE.test('12345678')).toBe(false)
    })

    it('Reject a password shorter than 8 characters', () => {
        expect(PASSWORD_RULE.test('abc123')).toBe(false)
    })

    it('accepts a password containing special characters like !@#$', () => {
        expect(PASSWORD_RULE.test('abc123!@')).toBe(true)
    })

    // class [A-Za-z\d\W] has \W explicitly excludes "_" (word character).
    it('Reject a password containing an underscore, even if otherwise valid', () => {
        expect(PASSWORD_RULE.test('abc12345_')).toBe(false)
    })
})