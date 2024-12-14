// const express = require('express')
// const passport = require('passport')
// const OAuth2Strategy = require('passport-oauth2')
// const pool = require('../db/db')
// require('dotenv').config()
// const bcrypt = require('bcryptjs')
// const jwt = require('jsonwebtoken')

// const router = express.Router()

// // signup route
// router.post('/signup', async (req, res) => {
//     const { email, password } = req.body
//     try {
//       const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email])
//       if (userExists.rows.length > 0) {
//         return res.status(400).json({ message: 'User already exists!' })
//       }
//       const hashedPassword = await bcrypt.hash(password, 10)
//       await pool.query(
//         'INSERT INTO users (email, password) VALUES ($1, $2)',
//         [email, hashedPassword]
//       )
//       res.status(201).json({ message: 'User created successfully!' })
//     } catch (error) {
//       console.error(error)
//       res.status(500).json({ message: error.message })
//     }
//   })

// // login route
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body
//     try {
//       const user = await pool.query('SELECT * FROM users WHERE email = $1', [email])
//       if (user.rows.length === 0) {
//         return res.status(400).json({ message: 'Invalid credentials!' })
//       }
//       const validPassword = await bcrypt.compare(password, user.rows[0].password)
//       if (!validPassword) {
//         return res.status(400).json({ message: 'Invalid credentials!' })
//       }
//       const token = jwt.sign({ userId: user.rows[0].id }, process.env.SECRET_TOKEN, { expiresIn: '1h' })
//       res.status(200).json({ message: 'Login successful!', token })
//     } catch (error) {
//       console.error(error)
//       res.status(500).json({ message: error.message })
//     }
//   })

// // instagram OAuth implementation

//   passport.use(
//     new OAuth2Strategy({
//             authorizationURL: 'https://api.instagram.com/oauth/authorize',
//             tokenURL: 'https://api.instagram.com/oauth/access_token',
//             clientID: process.env.INSTAGRAM_CLIENT_ID,
//             clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
//             callbackURL: process.env.INSTAGRAM_REDIRECT_URI,
//         },async (accessToken, done) => {
//             console.log({token: accessToken})
//             try {
//                 const userProfileResponse = await fetch(
//                     `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
//                 )
//                 const userProfile = await userProfileResponse.json()
//                 if (!userProfile.id || !userProfile.username) {
//                     throw new Error('Failed to fetch user profile from Instagram')
//                 }
//                 const { rows } = await pool.query(
//                     `
//                     INSERT INTO users (email, instagram_token)
//                     VALUES ($1, $2)
//                     ON CONFLICT (email) DO UPDATE
//                     SET instagram_token = EXCLUDED.instagram_token
//                     RETURNING *;
//                     `,
//                     [userProfile.username, accessToken]
//                 )
//                 return done(null, rows[0])
//             }catch (error) {
//                 return done(error)
//             }
//         })
//     )

//     router.get('/instagram', passport.authenticate('oauth2', { scope: ['instagram_basic', 'user_media'] }))
//     router.get('/auth/instagram/callback',passport.authenticate('oauth2', { failureRedirect: '/' }),(req, res) => {
//         res.json({
//             message: 'Authentication successful',
//             user: req.user,
//         })
//         console.log({user})
//     })

// module.exports = router

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  "https://baczovkpkoeusisdrezc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3pvdmtwa29ldXNpc2RyZXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxODc4NTcsImV4cCI6MjA0OTc2Mzg1N30.jy7fBPb8j4DduD2HsN6boOjefjCXbP5e1lGa2vvZEt4"
);

// Signup route
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Create new user with auto-verification
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          created_at: new Date(),
        },
        emailRedirectTo: undefined, // Disable email redirect
        emailConfirm: false, // Disable email confirmation
      },
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Success response
    res.status(201).json({
      message: "User created and verified successfully!",
      user: data.user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "An error occurred during signup",
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(200).json({
      message: "Login successful",
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "An error occurred during login",
    });
  }
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user profile",
    });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error during logout",
    });
  }
});

module.exports = router;
