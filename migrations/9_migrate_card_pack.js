const CardPack = artifacts.require("CardPack");
const TaleToken = artifacts.require("TaleToken");
const MinterFactory = artifacts.require("MinterFactory");

module.exports = async function (deployer) {
     await deployer.deploy(CardPack,
        "0xCE574E606F69092A2a15567881dA385caC7d1F96", 
        "0x7d8CdeeFA692e720bA41CFF753c32674120c30b4", 
        TaleToken.address,
        MinterFactory.address);
    let cardPack = await CardPack.deployed();
    let minterFactory = await MinterFactory.deployed();
    await minterFactory.addMinter(cardPack.address);
};
