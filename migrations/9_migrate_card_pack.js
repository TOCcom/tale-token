const CardPack = artifacts.require("CardPack");
const TaleToken = artifacts.require("TaleToken");
const MinterFactory = artifacts.require("MinterFactory");

module.exports = async function (deployer) {
     await deployer.deploy(CardPack,
        "0x0000000000000000000000000000000000000000", 
        "0x0000000000000000000000000000000000000000", 
        TaleToken.address,
        MinterFactory.address);
    let cardPack = await CardPack.deployed();
    let minterFactory = await MinterFactory.deployed();
    await minterFactory.addMinter(cardPack.address);
};
