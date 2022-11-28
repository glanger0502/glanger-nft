import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from 'hardhat';
import { GlangerNFT } from '../typechain-types/contracts/GlangerNFT';
import { configs } from '../utils/configs';

describe("Glanger NFT", () => {
    let contract : GlangerNFT;
    let _baseTokenURI = configs.baseTokenURI;
    let _openBoxBeforeTokenURI = configs.openBoxBeforeURI;
    let _maxTotalSupply = configs.totlaSupply;
    let _openBoxTime = configs.openBoxTime;
    let _executeAddress : string;
    let _executor: SignerWithAddress;
    let _account2: SignerWithAddress;
    let _owner: SignerWithAddress;
    let _account3: SignerWithAddress;

    beforeEach(async () => {
        const glangerNFT = await ethers.getContractFactory("GlangerNFT");
        const [owner, account1, account2, account3] = await ethers.getSigners();
        contract = await glangerNFT.deploy(_baseTokenURI, _openBoxBeforeTokenURI, _maxTotalSupply, _openBoxTime, account1.address);
        _executeAddress = account1.address;
        _executor = account1;
        _account2 = account2;
        _account3 = account3;
        _owner = owner;
        await contract.deployed();
    })

    describe("tokenURI", () => {
        it("should revert with URIQueryForNonexistentToken", async () => {
            await expect(contract.tokenURI(1)).to.be.revertedWithCustomError(contract, "URIQueryForNonexistentToken");
        })
    })

    describe("setStage", () => {
        const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
        it("is not executor", async () => {
            expect(contract.setStage(stageType, startTime, endTime, maxQuantity, price))
            .to.be.revertedWith("caller is not Executor");
        });

        it("executor set the stage", async () => {
            await expect(contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price))
            .to.emit(contract, 'StageEvent').withArgs(stageType, startTime, endTime, maxQuantity, 0, price)
        })
    })

    describe("setBaseTokenURI", () => {
        it("set base toke uri", async () => {
            await contract.connect(_executor).setBaseTokenURI("test");
            // expect(await contract.baseTokenURI()).to.be.equal("test");
        })
    })

    describe("setOpenBoxBeforeTokenURI", () => {
        it("set openBox before TtokenURI", async () => {
            await expect(contract.connect(_executor).setOpenBoxBeforeTokenURI("test2"))
                .to.be.emit(contract, "setOpenBoxBeforeTokenURIEvent").withArgs("test2");
        })
    })

    describe("setMaxTotalSupply", () => {
        it("set maxTotal supply", async () => {
            await expect(contract.connect(_executor).setMaxTotalSupply(configs.totlaSupply))
                .to.be.emit(contract, "MaxTotalSupplyEvent").withArgs(configs.totlaSupply);
        })  
    })

    describe("setOpenBoxTime", () => {
        it("set openbox time", async () => {
            await expect(contract.connect(_executor).setOpenBoxTime(configs.newOpenBoxtime))
                .to.be.emit(contract, "OpenBoxTimeEvent").withArgs(configs.newOpenBoxtime);
        })
    })

    describe("getStage", () => {
        it("caller is not executor", async () => {
            await contract.setExecutorAddress(_owner.address);

            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage2;
            await contract.setStage(stageType, startTime, endTime, maxQuantity, price)
            const stageInfo2 = await contract.getStage(stageType);
        })

        it("get the stage", async () => {

            expect(await contract.connect(_executor).getStage(1)).to.be.revertedWith("invalid type");

            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage2;
            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price)
            const stageInfo2 = await contract.connect(_executor).getStage(stageType);

            expect([stageInfo2._stageType.toNumber()]).eql([stageType])
        });
    })

    describe("getExecutorAddress", () => {
        it("is executor", async () => {
            expect(await contract.getExecutorAddress()).to.be.equal(_executeAddress);
        })
    })

    describe("setOpenBoxTime", () => {
        const openBoxTime = configs.newOpenBoxtime;

        it("set openbox time error", async () => {
            expect(contract.setOpenBoxTime(openBoxTime)).to.be.revertedWith("caller is not Executor");
        })

        it("set openbox time correct", async () => {
            await expect(contract.connect(_executor).setOpenBoxTime(openBoxTime)).to.be.emit(contract, "OpenBoxTimeEvent").withArgs(openBoxTime);
        })
    })

    describe("executorMint", () => {
        it("mint a nft", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            
            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await ethers.provider.send("evm_increaseTime", [2*24*60*60]);

            expect(await contract.totalSupply()).to.equal(await contract.balanceOf(_owner.address))
            expect(contract.connect(_executor).executorMint(_account2.address, maxQuantity)).to.be.emit(contract, "NFTMintEvent");
        })
    })

    describe("currentStage", () => {
        it("get current stage", async () => {     
            console.log(await contract.currentStage());       
            // expect(await contract.currentStage()).to.be.equal([ethers.utils.parseUnits("0"), false, ethers.utils.parseUnits("0")])
        })
    })

    describe("mint", () => {
        const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
        const mintTime = configs.mintTime;

        it("nft is not open", async () => {
            await contract.setPause(true);
            expect(contract.mint(_account2.address, maxQuantity)).to.be.revertedWith("nft is not open");
        })

        it("stage is not open", async () => {
            expect(contract.mint(_account2.address, maxQuantity)).to.be.revertedWith("stage is not open");
        })

        it("nft mint success", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await expect(contract.connect(_account2).mint(_account2.address, maxQuantity, {
                value: ethers.utils.parseEther("0.3")
            }))
                .to.emit(contract, 'NFTMintEvent').withArgs(stageType, maxQuantity-1, _account2.address, maxQuantity, price);
        })
    })

    describe("approve", () => {
        it("approve success", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await contract.connect(_account2).mint(_account2.address, maxQuantity, {
                value: ethers.utils.parseEther("0.3")
            });

            await expect(contract.connect(_account2).approve(_account2.address, 0)).to.be.emit(contract, 'Approval');
        })
    })

    describe("setApprovalForAll", () => {
        it("approve for all success", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);
            
            await contract.connect(_account2).mint(_account2.address, maxQuantity, {
                value: ethers.utils.parseEther("0.3")
            });

            await expect(contract.connect(_account2).setApprovalForAll(_account2.address, true)).to.emit(contract, "ApprovalForAll");
        });
    })

    describe("setBlackMarketplaces", () => {
        it("set blackmarket success", async () => {
            await contract.connect(_executor).setBlackMarketplaces(_account2.address, false);
            expect(await contract.connect(_executor).isBlackMarketplaces(_account2.address)).to.be.equal(false);
        })
    })

    describe("isBlackMarketplaces", () => {
        it("check isblackmarketpalces success", async () => {
            await contract.connect(_executor).setBlackMarketplaces(_account2.address, false);
            expect(await contract.connect(_executor).isBlackMarketplaces(_account2.address)).to.equal(false);
        })
    })

    describe("setPause", () => {
        it("set the nft stop success", async () => {
            await expect(contract.connect(_owner).setPause(true)).to.be.emit(contract, "PauseEvent");
        });
    })

    describe("withDrawAll", () => {
        it("withdraw success ", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await contract.connect(_account2).mint(_account2.address, maxQuantity, {
                value: ethers.utils.parseEther("0.3")
            });            

            await contract.connect(_owner).withDrawAll(_account2.address);
            const balance = await contract.balanceOf(_account2.address);
            expect(balance.toNumber() == 1);
        })
    })

    describe("setExecutorAddress", () => {
        it("set executorAddress success ", async () => {
            await expect(contract.setExecutorAddress(_account2.address)).to.be.emit(contract, "ExecutorAddressEvent");
        })
    })

    describe("tokenURI", () => {
        it("get tokeURI success", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await contract.connect(_account2).mint(_account2.address, maxQuantity, {
                value: ethers.utils.parseEther("0.3")
            });     
            const balance = await contract.balanceOf(_account2.address);
            expect(balance.toString()).to.be.equal('3');
            
            // console.log(await contract.tokenURI(1));
        })
    })

    describe("executorMint", () => {

        it("executor mint exceed maxTotalSupply failure", async() => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            console.log(_executor.address);
            console.log(_account2.address);

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await contract.connect(_executor).executorMint(_executor.address, maxQuantity);
        })

        it("executor mint success", async() => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await expect(contract.connect(_executor).executorMint(_executor.address, maxQuantity))
                .to.emit(contract, "NFTMintEvent").withArgs(0, 2, _executeAddress, maxQuantity, 0);     
        })
    })

    describe("transfer", () => {

        it("transfer error", async () => {
            const {stageType, startTime, endTime, maxQuantity, price} = configs.stage.stage1;
            const buyPrice = configs.buyPrice;
            const mintTime = configs.mintTime;

            await contract.connect(_executor).setStage(stageType, startTime, endTime, maxQuantity, price);

            await contract.connect(_executor).executorMint(_executor.address, maxQuantity);     

            await contract.connect(_executor).transferFrom(_executor.address, _account2.address, 0);
        })
    })
})