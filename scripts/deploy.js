/**
 * START CONFIG SECTION
 */
const instantBeneficiaries = [
    '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', '70000000000000000000000000',     // public sale
    '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2', '30000000000000000000000000',     // private sale
    '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', '17850000000000000000000000',     // ecosystem
    '0x617F2E2fD72FD9D5503197092aC168c91465E7f2', '5000000000000000000000000',      // exchange fee
    '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB', '4800000000000000000000000'       // marketing
];
const privateSaleVestingBeneficiaries = [
    { address: '0x14A2E1244eaEcf75d8B5cB5bc6Df19AF9D00beF9', amount: '30000000000000000000000000' },
    { address: '0xe1dE574564484350fcf65cAbdC2166FE281a8833', amount: '30000000000000000000000000' }
];
const teamAndAdvisorVestingBeneficiaries = [
    { address: '0x073fbB403410CC171E3cd7d4667420b544650515', amount: '30000000000000000000000000' },
    { address: '0xc47076E159b15a212aFF0ad278EFB31d32665C3e', amount: '30000000000000000000000000' }
];
const ecosystemVestingBeneficiaries = [
    { address: '0xeEa653F68fAA7115c34bF8C1B950Fd2804B60200', amount: '30000000000000000000000000' },
    { address: '0xb5201E886149A1f0499c901c5814298491a46FA9', amount: '30000000000000000000000000' }
];
const marketingVestingBeneficiaries = [
    { address: '0x2CBd8e69699A673d7D254cbdD1f34354CCb99F90', amount: '30000000000000000000000000' },
    { address: '0xbc8F5DD3f7446cFD6d125200d9541173d2EC0FA5', amount: '30000000000000000000000000' }
];
const exhangeFeeVestingBeneficiaries = [
    { address: '0x7C94FA5FEB3Fd3110E07B886157252fFf17aF8f7', amount: '30000000000000000000000000' },
    { address: '0x5FcE589922179eE6655DFd1279f04B83733ead15', amount: '30000000000000000000000000' }
];
/**
 * END CONFIG SECTION
 */

let contractAddress;

async function deploy() {
    let metadata = JSON.parse(await remix.call('fileManager', 'getFile', 'contracts/artifacts/TaleToken.json'));
    const signer = (new ethers.providers.Web3Provider(web3Provider)).getSigner()
    let factory = new ethers.ContractFactory(metadata.abi, metadata.data.bytecode.object, signer);
    let contract = await factory.deploy(instantBeneficiaries[0], instantBeneficiaries[1], 
                                        instantBeneficiaries[2], instantBeneficiaries[3], 
                                        instantBeneficiaries[4], instantBeneficiaries[5], 
                                        instantBeneficiaries[6], instantBeneficiaries[7], 
                                        instantBeneficiaries[8], instantBeneficiaries[9],);
    contractAddress = contract.address;
    console.log("Contract address:" + contract.address);
    console.log("Transaction hash:" + contract.deployTransaction.hash);
    await contract.deployed();
    console.log('Tale Token deployed');
}

async function addVesting(functionName, benefeciaries) {
    console.log('Start ' + functionName);
    for (let i = 0; i < benefeciaries.length; ++i) {        
        let benefeciary = benefeciaries[i];
        let metadata = JSON.parse(await remix.call('fileManager', 'getFile', 'contracts/artifacts/TaleToken.json'));
        let contract = new web3.eth.Contract(metadata.abi, contractAddress);        
        const accounts = await web3.eth.getAccounts();
        await contract.methods[functionName](benefeciary.address, benefeciary.amount).send({ from: accounts[0] });
        console.log('Competed ' + functionName + '(' + benefeciary.address + ', ' + benefeciary.amount + ')');
    }
}

deploy()
.then(() => console.log(privateSaleVestingBeneficiaries.length))
  .then(() => addVesting("addPrivateSaleVestingAddress", privateSaleVestingBeneficiaries))
  .then(() => addVesting("addTeamAndAdvisorVestingAddress", teamAndAdvisorVestingBeneficiaries))
  .then(() => addVesting("addEcosystemVestingAddress", ecosystemVestingBeneficiaries))
  .then(() => addVesting("addMarketingVestingAddress", marketingVestingBeneficiaries))
  .then(() => addVesting("addExchangeFeeVestingAddress", exhangeFeeVestingBeneficiaries))
  .then(() => console.log("SUCCESS! All vestings launched. Contract address: " + contractAddress))
  .catch((error) => {
    console.error(error);
  });