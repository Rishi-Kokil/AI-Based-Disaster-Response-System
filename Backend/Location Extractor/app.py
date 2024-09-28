import PIL.Image
import PIL.ExifTags


img= PIL.Image.open('DSCN0012.jpg')
exif={
    PIL.ExifTags.TAGS[k]: v
    for k, v in img._getexif().items()
    if k in PIL.ExifTags.TAGS
}

print (exif.get('GPSInfo'))

north=exif.get('GPSInfo').get(2)
east=exif.get('GPSInfo').get(4)


lat=((((north[0]*60)+north[1])*60)+north[2])/60/60
long=((((east[0]*60)+east[1])*60)+east[2])/60/60

lat,long=float(lat),float(long)
print(lat,"  ",long)

