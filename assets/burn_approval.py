import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def burn_approval():

    basic_checks= And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address()
    )

    assetID = Btoi(Txn.application_args[0])
    handle_creation = Seq([
        Assert(basic_checks),
        App.globalPut(Bytes("assetID"), assetID),
        App.globalPut(Bytes("optedIN"), Int(0)),
        Return(Int(1))
    ])

    senderAssetBalance = AssetHolding.balance(Global.current_application_address(), App.globalGet(Bytes("assetID")))
    amount = Seq(
        senderAssetBalance,
        Assert(senderAssetBalance.hasValue()),
        senderAssetBalance.value()
    )
    optin_asset_burn=Seq([
        Assert(basic_checks),
        Assert(App.globalGet(Bytes("assetID"))==Txn.assets[0]),
        Assert(Txn.sender() == Global.creator_address()),
        Assert(App.globalGet(Bytes("optedIN"))==Int(0)), #if th global state of optedIn = 0 he will do the optin else he will not like a boolean (0 or 1 )!!
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Global.current_application_address(),
        TxnField.asset_amount: Int(0),
        TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("optedIN"), Int(1)),
        Return(Int(1))
    ])

    handle_noop = Seq(
         Cond(
            [Txn.application_args[0] == Bytes("optin_asset_burn"), optin_asset_burn],
        )
    )

    handle_optin = Return(Int(0))
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

    print(compileTeal(burn_approval(), mode=Mode.Application, version=6))