import { hashPassword } from '../backend/lib/admin.js'

const password = process.argv[2] || 'aiindex2025'

async function generate() {
  try {
    const hash = await hashPassword(password)
    console.log(`Password: ${password}`)
    console.log(`Hash: ${hash}`)
    console.log(`\nAdd this to your .env file:`)
    console.log(`ADMIN_PASSWORD_HASH=${hash}`)
  } catch (error) {
    console.error('Error generating hash:', error)
    process.exit(1)
  }
}

generate()
