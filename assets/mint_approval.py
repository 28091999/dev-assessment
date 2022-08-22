import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def mint_approval():

    basic_checks= And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address()
    )

    create_asset = Seq(
        Assert(basic_checks),
        Assert(App.globalGet(Bytes("teslaid"))==Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1_000_000),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_unit_name: Bytes("TSLA"),
            TxnField.config_asset_name: Bytes("Tesla"),
            TxnField.config_asset_manager: Global.current_application_address(),
            TxnField.config_asset_freeze: Global.current_application_address(),
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("teslaid"), InnerTxn.created_asset_id()),
        Return(Int(1))
        # InnerTxn.created_asset_id() would represent the asset id that was just created
    )

    handle_creation = Seq([
        Assert(basic_checks),
        Return(Int(1))
    ])

    amountToSendForTransfer = Btoi(Txn.application_args[1])
    senderAssetBalance = AssetHolding.balance(Global.current_application_address(), App.globalGet(Bytes("teslaid")))
    amount = Seq(
        senderAssetBalance,
        Assert(senderAssetBalance.hasValue()),
        senderAssetBalance.value()
    )
    asset_transfer_holding = Seq([
        Assert(basic_checks),
        Assert(Txn.sender() == Global.creator_address()), # creator only function
        Assert(amountToSendForTransfer <= amount),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Txn.accounts[1],
        TxnField.asset_amount: amountToSendForTransfer,
        TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
        }),
        InnerTxnBuilder.Submit(),
        Return(Int(1))
    ])

    amountToSendForTransfer1 = Btoi(Txn.application_args[1])
    asset_transfer_burn = Seq([
        Assert(basic_checks),
        Assert(Txn.sender() == Global.creator_address()), # creator only function
        Assert(amountToSendForTransfer1 <= amount),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Txn.accounts[1],
        TxnField.asset_amount: amountToSendForTransfer1,
        TxnField.xfer_asset: Txn.assets[0],
        }),
        InnerTxnBuilder.Submit(),
        Return(Int(1))
    ])

    handle_optin = Return(Int(0))

    handle_noop = Seq(
        Cond(
            [Txn.application_args[0] == Bytes("create_asset"), create_asset],
            [Txn.application_args[0] == Bytes("transfer"), asset_transfer_holding],
            [Txn.application_args[0] == Bytes("burn"), asset_transfer_burn],
        )
    )
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop]
    )

    return program

if __name__ == "__main__":
    params = {}

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(mint_approval(), mode=Mode.Application, version=6))