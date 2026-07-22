import { slugify, pickUser, extractPublicId } from '~/utils/formatters'

describe('slugify', () => {
  it('Return empty string if empty input or falsy', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })

  it('Convert number to string', () => {
    expect(slugify(2024)).toBe('2024')
  })

  it('Split accented characters into their base characters and diacritical marks and remove all the accents', () => {
    expect(slugify('Dự án trello của tôi')).toBe('du-an-trello-cua-toi')
  })

  it('Trim leading or trailing whitespace', () => {
    expect(slugify('   Hello World   ')).toBe('hello-world')
  })

  it('Convert to lowercase', () => {
    expect(slugify('Hello-World')).toBe('hello-world')
  })

  it('Remove non-alphanumeric characters', () => {
    expect(slugify('Dự@ án trello!')).toBe('du-an-trello')
  })

  it('Replace spaces with hyphens', () => {
    expect(slugify('Dự   án')).toBe('du-an')
  })

  it('Remove consecutive hyphens', () => {
    expect(slugify('Dự---án')).toBe('du-an')
  })
})

describe('pickUser', () => {
  it('Return {} if empty user', () => {
    expect(pickUser(null)).toEqual({})
    expect(pickUser(undefined)).toEqual({})
  })

  it('Return these fields are allowed', () => {
    const fakeUser = {
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed-password-should-not-leak',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
      role: 'client',
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      verifyToken: 'secret-token-should-not-leak'
    }

    const result = pickUser(fakeUser)

    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('verifyToken')
    expect(result).toEqual({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
      role: 'client',
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02'
    })
  })

  it('Keep original object, dont need to add more fields', () => {
    const partialUser = { _id: 'user123', email: 'test@example.com' }
    const result = pickUser(partialUser)
    expect(result).toEqual({ _id: 'user123', email: 'test@example.com' })
  })
})

describe('extractPublicId', () => {
  it('Decode URL', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v123/trello/my%20avatar.jpg'
    expect(extractPublicId(url)).toBe('trello/my avatar.jpg')
  })

  it('Return null if URL not has /upload/', () => {
    const url = 'https://res.cloudinary.com/demo/image/trello/avatar123.jpg'
    expect(extractPublicId(url)).toBeNull()
  })

  it('Extract publicId from URL has version prefix', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1699999999/trello/avatar123.jpg'
    expect(extractPublicId(url)).toBe('trello/avatar123.jpg')
  })

  it('Extract publicId from URL not has version prefix', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/trello/avatar123.jpg'
    expect(extractPublicId(url)).toBe('trello/avatar123.jpg')
  })

  it('Return null when input is undefined (does not throw)', () => {
    expect(extractPublicId(undefined)).toBeNull()
  })

  it('Throw an error when URL contains an invalid % character', () => {
    const malformedUrl = 'https://res.cloudinary.com/upload/v123/broken%2.jpg'
    expect(() => extractPublicId(malformedUrl)).toThrow()
  })
})