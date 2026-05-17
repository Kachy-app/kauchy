from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from paymentapp.models import Transaction
from django.db.models import Sum

User = get_user_model()

class GetUserProfile(APIView):
    def get(self, request, pk):
        try:
            data = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({"message":"User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        vendor_tx_qs = Transaction.objects.filter(
            transaction_type='PURCHASE',
            status='COMPLETED',
            vendor__vendor=pk
        )
        total_sales_quantity = vendor_tx_qs.aggregate(total_qty=Sum('quantity'))['total_qty'] or 0
        
        serializer = UserSerializer(data)
        response = {"info": serializer.data}
        response["sales"] = int(total_sales_quantity)
        # print(response)
        return Response(response, status=status.HTTP_200_OK)