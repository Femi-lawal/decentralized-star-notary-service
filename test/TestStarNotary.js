// const { assert } = require("console");

const StarNotary = artifacts.require("StarNotary");

var accounts;
var owner;

contract("StarNotary", (accs) => {
  accounts = accs;
  owner = accounts[0];
});

describe("Start Notary tests", function () {
  this.timeout(5000);

  const StarNotary = artifacts.require("StarNotary");

  var accounts;
  var owner;

  contract("StarNotary", (accs) => {
    accounts = accs;
    owner = accounts[0];
  });

  it("can Create a Star", async () => {
    let tokenId = 1;
    let instance = await StarNotary.deployed();
    await instance.createStar("Awesome Star!", tokenId, { from: accounts[0] });
    assert.equal(
      await instance.tokenIdToStarInfo.call(tokenId),
      "Awesome Star!"
    );
  });

  it("lets user1 put up their star for sale", async () => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let starId = 2;
    let starPrice = web3.utils.toWei(".01", "ether");
    await instance.createStar("awesome star", starId, { from: user1 });
    await instance.putStarUpForSale(starId, starPrice, { from: user1 });
    assert.equal(await instance.starsForSale.call(starId), starPrice);
  });

  it("lets user1 get the funds after the sale", async () => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 3;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar("awesome star", starId, { from: user1 });
    await instance.putStarUpForSale(starId, starPrice, { from: user1 });
    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user1);
    await instance.buyStar(starId, { from: user2, value: balance });
    let balanceOfUser1AfterTransaction = await web3.eth.getBalance(user1);
    let value1 = Number(balanceOfUser1BeforeTransaction) + Number(starPrice);
    let value2 = Number(balanceOfUser1AfterTransaction);
    assert.equal(value1, value2);
  });

  it("lets user2 buy a star, if it is put up for sale", async () => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 4;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar("awesome star", starId, { from: user1 });
    await instance.putStarUpForSale(starId, starPrice, { from: user1 });
    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user2);
    await instance.buyStar(starId, { from: user2, value: balance });
    assert.equal(await instance.ownerOf.call(starId), user2);
  });

  it("lets user2 buy a star and decreases its balance in ether", async () => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 5;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar("awesome star", starId, { from: user1 });
    await instance.putStarUpForSale(starId, starPrice, { from: user1 });
    const balanceOfUser2BeforeTransaction = web3.utils.toBN(
      await web3.eth.getBalance(user2)
    );
    const txInfo = await instance.buyStar(starId, {
      from: user2,
      value: balance,
    });
    const balanceAfterUser2BuysStar = web3.utils.toBN(
      await web3.eth.getBalance(user2)
    );

    // Important! Note that because these are big numbers (more than Number.MAX_SAFE_INTEGER), we
    // need to use the BN operations, instead of regular operations, which cause mathematical errors.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
    // console.log("Ok  = " + (balanceOfUser2BeforeTransaction.sub(balanceAfterUser2BuysStar)).toString());
    // console.log("Bad = " + (balanceOfUser2BeforeTransaction - balanceAfterUser2BuysStar).toString());

    // calculate the gas fee
    const tx = await web3.eth.getTransaction(txInfo.tx);
    const gasPrice = web3.utils.toBN(tx.gasPrice);
    const gasUsed = web3.utils.toBN(txInfo.receipt.gasUsed);
    const txGasCost = gasPrice.mul(gasUsed);

    // make sure that [final_balance == initial_balance - star_price - gas_fee]
    const starPriceBN = web3.utils.toBN(starPrice); // from string
    const expectedFinalBalance = balanceOfUser2BeforeTransaction
      .sub(starPriceBN)
      .sub(txGasCost);
    assert.equal(
      expectedFinalBalance.toString(),
      balanceAfterUser2BuysStar.toString()
    );
  });

  // Implement Task 2 Add supporting unit tests

  it("can add the star name and star symbol properly", async () => {
    // 1. create a Star with different tokenId
    let instance = await StarNotary.deployed();
    let user = accounts[1];
    let starId = 10000;
    await instance.createStar("Andromeda", starId, { from: user });

    //2. Call the name and symbol properties in your Smart Contract and compare with the name and symbol provided
    let name = await instance.name();
    let symbol = await instance.symbol();
    assert.equal(name, "Starnotoken");
    assert.equal(symbol, "SNT");
  });

  it("lets 2 users exchange stars", async () => {
    let instance = await StarNotary.deployed();
    // 1. create 2 Stars with different tokenId
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId1 = 14;
    let starId2 = 73;
    await instance.createStar("Rudolph", starId1, { from: user1 });
    await instance.createStar("Anxes", starId2, { from: user2 });

    // 2. Call the exchangeStars functions implemented in the Smart Contract
    await instance.exchangeStars(starId1, starId2, { from: user1 });

    // 3. Verify that the owners changed
    let owner1 = await instance.ownerOf(starId1);
    let owner2 = await instance.ownerOf(starId2);
    assert.equal(owner1, user2);
    assert.equal(owner2, user1);
  });

  it("lets a user transfer a star", async () => {
    let instance = await StarNotary.deployed();
    // 1. create a Star with different tokenId
    let user1 = accounts[1];
    let user2 = accounts[2];
    let starId = 10001;
    await instance.createStar("Sandman", starId, { from: user1 });

    // 2. use the transferStar function implemented in the Smart Contract
    await instance.transferStar(user2, starId, { from: user1 });

    // 3. Verify the star owner changed.
    let owner = await instance.ownerOf(starId);
    assert.equal(owner, user2);
  });

  it("lookUptokenIdToStarInfo test", async () => {
    let instance = await StarNotary.deployed();
    // 1. create a Star with different tokenId
    let user1 = accounts[1];
    let starId = 10002;
    await instance.createStar("Dalmatian", starId, { from: user1 });

    // 2. Call your method lookUptokenIdToStarInfo
    let starName = await instance.lookUptokenIdToStarInfo(starId);

    // 3. Verify if you Star name is the same
    assert.equal(starName, "Dalmatian");
  });
});
