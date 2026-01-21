from django.db import models

# Create your models here.

class Product(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=60, help_text="Name of the product")
    barcode_serial = models.CharField(max_length=100, help_text="Barcode or serial number", null=True, blank=True)
    def __str__(self):
        return self.name
    
class Photo(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='photos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="photos", blank=True,null=True)
    feature = models.ForeignKey('FeatureOfFault', on_delete=models.CASCADE, related_name="photos", blank=True,null=True)
    def __str__(self):
        return self.title

class FeatureOfFault(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, help_text="What would you call the feature of the fault?")
    description = models.CharField(max_length=300, help_text="What details of the fault do you notice?", null=True, blank=True)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="feature_of_faults", blank=True,null=True)

    def __str__(self):
        return self.name
    
class Fault(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, help_text="What is the fault?")
    description = models.CharField(max_length=300, help_text="Give more details of the fualt?", null=True, blank=True)
    features = models.ManyToManyField(FeatureOfFault, blank=True)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="faults", blank=True,null=True)
    
    def __str__(self):
        return self.name

class RepairAction(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=300, blank=True,null=True)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="repair_actions", blank=True,null=True)

    def __str__(self):
        return self.name
    
class ReasonNotRepaired(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=300, blank=True,null=True)
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reasons_not_repaired", blank=True,null=True)

    def __str__(self):
        return self.name

class RepairResult(models.Model):
    class Type(models.TextChoices):
        REPAIR = 'R', 'Repaired'
        NOT_REPAIR = 'N','Not repaired'
        PARTIAL_REPAIR = 'P','Partial repair'

    id = models.BigAutoField(primary_key=True)
    text = models.CharField(max_length=60, help_text="Label that represents this reason")
    type = models.CharField(max_length=1, choices=Type.choices, help_text="What is the outcome from the repair")
    product_id = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="repair_results", blank=True,null=True)
    date = models.DateField(blank=True, null=True)
    repair_action = models.ManyToManyField(RepairAction, blank=True)
    reason_not_repaired = models.ManyToManyField(ReasonNotRepaired, blank=True)
    notes = models.CharField(max_length=300, help_text="What features of the fault do you notice?", null=True, blank=True)
    time_to_repair = models.DurationField(null=True, blank=True)
    time_to_diagnose = models.DurationField(null=True, blank=True)
    fault_diagnosed = models.ForeignKey(Fault, on_delete=models.CASCADE, related_name="repair_results", blank=True,null=True)
    photo_id = models.ManyToManyField(Photo,  blank=True,null=True)

    def __str__(self):
        return self.text

