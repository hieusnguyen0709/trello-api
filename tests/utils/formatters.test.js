// tests/utils/formatters.test.js
import { slugify } from '../../src/utils/formatters'

describe('slugify', () => {
  it('chuyển tiêu đề có dấu tiếng Việt thành slug', () => {
    expect(slugify('Dự Án Trello Của Tôi')).toBe('du-an-trello-cua-toi')
  })

  it('trả về chuỗi rỗng nếu input rỗng', () => {
    expect(slugify('')).toBe('')
  })

  it('loại bỏ ký tự đặc biệt', () => {
    expect(slugify('Board #1 @2024!')).toBe('board-1-2024')
  })
})