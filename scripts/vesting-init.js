/**
 * START CONFIGURATION SECTION
 */
const contractAddress = '0x9755ac467bee2e7558b89988df3de4ca4f16b123';
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
 * END CONFIGURATION SECTION
 */

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

addVesting("addPrivateSaleVestingAddress", privateSaleVestingBeneficiaries)
  .then(() => addVesting("addTeamAndAdvisorVestingAddress", teamAndAdvisorVestingBeneficiaries))
  .then(() => addVesting("addEcosystemVestingAddress", ecosystemVestingBeneficiaries))
  .then(() => addVesting("addMarketingVestingAddress", marketingVestingBeneficiaries))
  .then(() => addVesting("addExchangeFeeVestingAddress", exhangeFeeVestingBeneficiaries))
  .then(() => console.log("SUCCESS! All vestings launched."))
  .catch((error) => {
    console.error(error);
  });