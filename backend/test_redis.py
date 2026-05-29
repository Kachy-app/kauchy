import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Pymarket.settings')
django.setup()

from channels.layers import get_channel_layer
import asyncio

async def test():
    channel_layer = get_channel_layer()
    print("Layer:", channel_layer)
    try:
        await channel_layer.group_add("test", "test")
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
