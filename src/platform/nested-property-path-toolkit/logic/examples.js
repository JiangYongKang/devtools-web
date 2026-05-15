const deeplyNestedObject = {
  user: {
    profile: {
      name: {
        first: 'John',
        last: 'Doe',
      },
      contact: {
        email: 'john@example.com',
        phone: {
          home: '123-456-7890',
          work: '098-765-4321',
        },
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            zip: '10001',
          },
          {
            street: '456 Oak Ave',
            city: 'Boston',
            zip: '02101',
          },
        ],
      },
    },
    settings: {
      notifications: {
        email: true,
        push: false,
        sms: true,
      },
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'America/New_York',
      },
    },
  },
}

const sparseArrayObject = {
  items: [
    { id: 1, name: 'Item 1', price: 10 },
    undefined,
    { id: 3, name: 'Item 3', price: 30 },
    null,
    { id: 5, name: 'Item 5', price: 50 },
  ],
  metadata: {
    count: 3,
    total: 90,
  },
}

const mapLikeObject = {
  'key-with-dashes': 'value1',
  'key with spaces': 'value2',
  'special@#$key': 'value3',
  'unicode_123': {
    'nested.key': {
      'deeply.nested': 'deep value',
    },
  },
  users: {
    'user-1': { name: 'Alice', role: 'admin' },
    'user-2': { name: 'Bob', role: 'user' },
  },
}

const exampleSchema = {
  'user.profile.name.first': { required: true, type: 'string', minLength: 2 },
  'user.profile.contact.email': { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  'user.profile.contact.addresses[].city': { required: true, type: 'string' },
  'items[].price': { type: 'number', min: 0 },
}

const sensitivePaths = [
  'user.profile.contact.email',
  'user.profile.contact.phone',
  'password',
  'creditCard.number',
]

export {
  deeplyNestedObject,
  sparseArrayObject,
  mapLikeObject,
  exampleSchema,
  sensitivePaths,
}
