"""Payment-provider boundary. No provider currently accepts live transactions.

Future implementations must verify provider signatures, reconcile amount/currency
against the server-side order total, and process each transaction reference once.
Never trust a browser callback or screenshot as a payment confirmation.
"""
from typing import Protocol
from dataclasses import dataclass
from decimal import Decimal
@dataclass(frozen=True)
class PaymentResult:
    status: str
    reference: str|None=None
    redirect_url: str|None=None
class PaymentProvider(Protocol):
    def initiate(self,reference:str,amount:Decimal,currency:str)->PaymentResult:...
    def verify_webhook(self,payload:bytes,signature:str)->PaymentResult:...
class DisabledPaymentProvider:
    def initiate(self,reference:str,amount:Decimal,currency:str)->PaymentResult:
        raise RuntimeError('Online payment activation is in progress. Confirm your order with the store.')
    def verify_webhook(self,payload:bytes,signature:str)->PaymentResult:
        raise RuntimeError('No payment gateway is configured.')
