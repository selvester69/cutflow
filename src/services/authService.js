const userRepository = require('../repositories/userRepository');

class AuthService {
  async register(email, password, name) {
    if (!email || !password) {
      const err = new Error('Email and password required');
      err.status = 400;
      throw err;
    }
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('User already exists');
      err.status = 409;
      throw err;
    }
    const id = 'usr_' + Math.random().toString(36).slice(2, 9);
    // Basic password hashing simulation for baseline
    const user = await userRepository.create({
      id,
      email,
      password: 'hash_' + password,
      name: name || email.split('@')[0],
      createdAt: Date.now()
    });
    return user;
  }

  async login(email, password) {
    if (!email || !password) {
      const err = new Error('Email and password required');
      err.status = 400;
      throw err;
    }
    const user = await userRepository.findByEmail(email);
    if (!user || user.password !== 'hash_' + password) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    const token = `token_${user.id}_${Date.now()}`;
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }
}

module.exports = new AuthService();
