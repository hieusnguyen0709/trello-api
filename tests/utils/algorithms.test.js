import { pagingSkipValue } from '~/utils/algorithms'

describe('algorithms', () => {
    it('Return 0 if page or itemsPerPage is null', () => {
        expect(pagingSkipValue(0, 10)).toBe(0)
        expect(pagingSkipValue('', 10)).toBe(0)
        expect(pagingSkipValue(null, 10)).toBe(0)
        expect(pagingSkipValue(undefined, 10)).toBe(0)
        expect(pagingSkipValue(1, 0)).toBe(0)
        expect(pagingSkipValue(1, '')).toBe(0)
        expect(pagingSkipValue(1, null)).toBe(0)
        expect(pagingSkipValue(1, undefined)).toBe(0)
    })

    it('Return 0 when page or itemsPerPage is negative', () => {
        expect(pagingSkipValue(-1, 10)).toBe(0)
        expect(pagingSkipValue(1, -1)).toBe(0)
    })

    it('Return 0 skip value for the first page', () => {
        expect(pagingSkipValue(1, 10)).toBe(0)
    })

    it('Return 10 skip value for the second page', () => {
        expect(pagingSkipValue(2, 10)).toBe(10)
    })

    it('Return 90 skip value for the second page', () => {
        expect(pagingSkipValue(10, 10)).toBe(90)
    })
})