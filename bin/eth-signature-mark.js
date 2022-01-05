#!/usr/bin/env node
const sigmark = require('../sigmark');

const argv = require('mri')(process.argv.slice(2));
const package = require('../package.json');

async function main() {
    if (argv.v === true || argv.version === true) {
        console.log(package.version);
        return;
    }
    if (argv.c || argv.create) {
        const file = argv.c || argv.create;
        const sig = argv._[0];
        const coordinates = (argv._[1] || '').split(',').filter(i => i).map(i => parseInt(i, 10));
        await sigmark.drawSignatureMark(file, sig, ...coordinates);
        return;
    }
    if (argv.e || argv.extract) {
        const file = argv.e || argv.extract;
        const coordinates = (argv._[0] || '').split(',').filter(i => i).map(i => parseInt(i, 10));
        const result = await sigmark.extractSignatureMark(file, ...coordinates);
        console.log(result);
        return;
    }

    console.log('Ethereum Signature Mark Tool');
    console.log(`Version ${package.version}\n`);
    console.log('    Create a signature mark:');
    console.log('    eth-signature-mark --create <image path> <signature> (<x>,<y>,<w>,<h>)\n');
    console.log('    Extract a signature mark:');
    console.log('    eth-signature-mark --extract <image path> (<x>,<y>,<w>,<h>)');
}

main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});