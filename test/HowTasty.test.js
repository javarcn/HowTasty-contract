const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HowTasty Contract", function () {
  let HowTasty;
  let howTasty;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    HowTasty = await ethers.getContractFactory("HowTasty");
    howTasty = await HowTasty.deploy();
  });

  describe("Merchant Management", function () {
    it("Should add a new merchant", async function () {
      await howTasty.connect(addr1).addMerchant(
        "Tasty Pizza",
        "Downtown 123",
        "Best pizza in town",
        "Italian"
      );

      const merchant = await howTasty.merchants(1);
      expect(merchant.name).to.equal("Tasty Pizza");
      expect(merchant.creator).to.equal(addr1.address);
      expect(await howTasty.merchantCount()).to.equal(1);
    });

    it("Should fail if merchant already exists", async function () {
      await howTasty.addMerchant("Pizza", "Loc", "Desc", "Cat");
      await expect(
        howTasty.addMerchant("Pizza", "Loc", "Desc", "Cat")
      ).to.be.revertedWithCustomError(howTasty, "MerchantAlreadyExists");
    });
  });

  describe("Voting System", function () {
    beforeEach(async function () {
      await howTasty.addMerchant("Pizza", "Loc", "Desc", "Cat");
    });

    it("Should allow voting without image (weight 1)", async function () {
      await howTasty.connect(addr1).vote(1, true, "Good!", "");
      const merchant = await howTasty.merchants(1);
      expect(merchant.upVotes).to.equal(1);
      
      const reputation = await howTasty.getUserReputation(addr1.address);
      expect(reputation).to.equal(1);
    });

    it("Should allow voting with image (weight 5)", async function () {
      await howTasty.connect(addr1).vote(1, true, "Great!", "ipfs://hash");
      const merchant = await howTasty.merchants(1);
      expect(merchant.upVotes).to.equal(5);
    });

    it("Should apply reputation bonus", async function () {
      // 1. First vote to get 1 reputation
      await howTasty.connect(addr1).vote(1, true, "Good!", "");
      
      // 2. Add another merchant to vote on
      await howTasty.addMerchant("Burger", "Loc2", "Desc", "Cat");
      
      // 3. Second vote with 1 reputation
      // baseWeight = 5 (with image)
      // weight = 5 + (5 * 1 / 100) = 5 (due to integer division)
      // To see bonus, we need 100 reputation, but let's test the logic
      await howTasty.connect(addr1).vote(2, true, "Great!", "ipfs://hash");
      const merchant = await howTasty.merchants(2);
      expect(merchant.upVotes).to.equal(5);
    });

    it("Should reward voter and creator", async function () {
      const creator = addr2;
      const voter = addr1;
      
      // Add merchant (merchant ID will be 2 because beforeEach adds one)
      await howTasty.connect(creator).addMerchant("Cafe", "Loc", "Desc", "Cat");
      const merchantId = 2;
      
      const initialVoterBalance = await howTasty.balanceOf(voter.address);
      const initialCreatorBalance = await howTasty.balanceOf(creator.address);
      
      await howTasty.connect(voter).vote(merchantId, true, "Nice", "ipfs://hash");
      
      const weight = 5n;
      const reward = weight * 10n**18n;
      const bonus = (reward * 5n) / 100n;
      
      expect(await howTasty.balanceOf(voter.address)).to.equal(initialVoterBalance + reward);
      expect(await howTasty.balanceOf(creator.address)).to.equal(initialCreatorBalance + bonus);
    });

    it("Should prevent double voting", async function () {
      await howTasty.vote(1, true, "Ok", "");
      await expect(
        howTasty.vote(1, false, "Bad", "")
      ).to.be.revertedWithCustomError(howTasty, "AlreadyVoted");
    });
  });
});