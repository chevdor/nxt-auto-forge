// This is a sample file to help you get started with your config.
// Copy this file as config.js

// This file needs your Nxt account password as it needs to send it
// on your behalf.
// For this reason, it is HIGHLY recommended to setup a forging only
// account with no funds/alias/assets. This account gets then its forging 
// power from lease granted by your other accounts.

module.exports = {
    target: {
        url: 'http://localhost:7876',
        account: 'NXT-...',
        secretPhrase: 'secret'
    },
    log:{
    	enabled: false,
    	file: 'nxt-auto-forge.log'
    },
    webhook:{
    	enabled: false,
    	url: '192.168.0.1',
    	port: 80,
    	path: '/your_hook'
    }
};