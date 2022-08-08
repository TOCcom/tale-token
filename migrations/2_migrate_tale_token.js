const TaleToken = artifacts.require("TaleToken");

module.exports = function (deployer) {
  deployer.deploy(TaleToken, 
    "0x5127f6dc2ea3457596d816F20fE226A003639F00", toWei(71104167),
    "0x5127f6dc2ea3457596d816F20fE226A003639F00", toWei(45900000),
    "0x5127f6dc2ea3457596d816F20fE226A003639F00", toWei(70000000),
    "0x5127f6dc2ea3457596d816F20fE226A003639F00", toWei(5000000),
    "0x5127f6dc2ea3457596d816F20fE226A003639F00", toWei(5527500));
};

function toWei(number) {
  return number + '000000000000000000';
} 