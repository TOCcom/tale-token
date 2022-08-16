const Marketplace = artifacts.require("Marketplace");

module.exports = async function (deployer) {
    await deployer.deploy(Marketplace, "0xD9e68327A19E11d38e1708d1c4d6149C4B007E38", 500); //5%
};
