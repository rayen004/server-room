from __future__ import annotations

import typing


class _SubscriptableMarker:
    def __class_getitem__(cls, item):
        return item


class _ParamSpecArgs:
    def __init__(self, origin):
        self.__origin__ = origin


class _ParamSpecKwargs:
    def __init__(self, origin):
        self.__origin__ = origin


class ParamSpec:
    def __init__(self, name, *args, **kwargs):
        self.__name__ = name
        self.__args__ = args
        self.__kwargs__ = kwargs
        self.args = _ParamSpecArgs(self)
        self.kwargs = _ParamSpecKwargs(self)

    def __repr__(self):
        return f"~{self.__name__}"


class NotRequired(_SubscriptableMarker):
    pass


class Required(_SubscriptableMarker):
    pass


class ReadOnly(_SubscriptableMarker):
    pass


class TypeGuard(_SubscriptableMarker):
    pass


class TypeIs(_SubscriptableMarker):
    pass


class Unpack(_SubscriptableMarker):
    pass


class TypeAliasType:
    pass


class TypeVarTuple:
    def __init__(self, name, *args, **kwargs):
        self.__name__ = name
        self.__args__ = args
        self.__kwargs__ = kwargs

    def __repr__(self):
        return f"*{self.__name__}"


def deprecated(*args, **kwargs):
    def decorator(obj):
        return obj

    if args and callable(args[0]) and len(args) == 1 and not kwargs:
        return args[0]
    return decorator


def dataclass_transform(*args, **kwargs):
    def decorator(obj):
        return obj

    if args and callable(args[0]) and len(args) == 1 and not kwargs:
        return args[0]
    return decorator


Self = typing.TypeVar("Self")
Never = typing.NoReturn
Buffer = bytes
TypeAlias = object()

