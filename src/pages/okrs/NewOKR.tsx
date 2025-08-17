import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const keyResultSchema = z.object({
	description: z.string().min(1, 'Key result description is required'),
	target: z.string().min(1, 'Target is required'),
	current: z.string().optional().default('0'),
});

const okrSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	objective: z.string().min(1, 'Objective is required'),
	quarter: z.string().min(1, 'Quarter is required'),
	year: z.number().min(2020).max(2030),
	keyResults: z
		.array(keyResultSchema)
		.min(1, 'At least one key result is required'),
});

type OKRFormData = z.infer<typeof okrSchema>;

const NewOKR = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	const form = useForm<OKRFormData>({
		resolver: zodResolver(okrSchema),
		defaultValues: {
			title: '',
			description: '',
			objective: '',
			quarter: '',
			year: new Date().getFullYear(),
			keyResults: [{ description: '', target: '', current: '0' }],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'keyResults',
	});

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (file) {
			setUploadedFile(file);
			parseExcelFile(file);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
				['.xlsx'],
			'application/vnd.ms-excel': ['.xls'],
		},
		multiple: false,
	});

	const parseExcelFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: 'array' });
				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(worksheet, {
					header: 1,
				}) as any[][];

				// Parse the Excel data to extract OKR information
				if (jsonData.length > 1) {
					const [headerRow, dataRow] = jsonData;

					if (dataRow[0]) form.setValue('title', String(dataRow[0]));
					if (dataRow[1])
						form.setValue('description', String(dataRow[1]));
					if (dataRow[2])
						form.setValue('objective', String(dataRow[2]));
					if (dataRow[3])
						form.setValue('quarter', String(dataRow[3]));
					if (dataRow[4]) form.setValue('year', Number(dataRow[4]));

					// Parse key results (starting from column 5, pairs of description and target)
					const keyResults = [];
					for (let i = 5; i < dataRow.length; i += 2) {
						if (dataRow[i] && dataRow[i + 1]) {
							keyResults.push({
								description: String(dataRow[i]),
								target: String(dataRow[i + 1]),
								current: '0',
							});
						}
					}

					if (keyResults.length > 0) {
						form.setValue('keyResults', keyResults);
					}

					toast({
						title: 'Success',
						description: 'Excel file parsed successfully!',
					});
				}
			} catch (error) {
				toast({
					title: 'Error',
					description:
						'Failed to parse Excel file. Please check the format.',
					variant: 'destructive',
				});
			}
		};
		reader.readAsArrayBuffer(file);
	};

	const onSubmit = async (data: OKRFormData) => {
		setIsLoading(true);
		try {
			const user = await supabase.auth.getUser();
			if (!user.data.user?.id) {
				throw new Error('User not authenticated');
			}

			const { error } = await supabase.from('okrs').insert([
				{
					title: data.title,
					description: data.description,
					objective: data.objective,
					quarter: data.quarter,
					year: data.year,
					key_results: data.keyResults,
					status: 'active',
					progress: 0,
					user_id: user.data.user.id,
				},
			]);

			if (error) {
				toast({
					title: 'Error',
					description: error.message,
					variant: 'destructive',
				});
				return;
			}

			await supabase.functions.invoke('send-okr-notification', {
				body: JSON.stringify({
					userEmail: user.data.user.email,
					okrTitle: data.title,
					action: 'created',
				}),
			});

			toast({
				title: 'Success',
				description: 'OKR created successfully!',
			});
			navigate('/');
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An unexpected error occurred',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const removeUploadedFile = () => {
		setUploadedFile(null);
	};

	return (
		<div className='min-h-screen bg-background'>
			<div className='container mx-auto px-4 py-8 max-w-4xl'>
				<div className='mb-8'>
					<Button
						onClick={() => navigate('/')}
						variant='outline'
						className='mb-4'
					>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Back to Dashboard
					</Button>
					<h1 className='text-3xl font-bold'>Create New OKR</h1>
					<p className='text-muted-foreground mt-2'>
						Define your objectives and key results for success
					</p>
				</div>

				<div className='space-y-8'>
					{/* File Upload Section */}
					<Card>
						<CardHeader>
							<CardTitle>Import from Excel (Optional)</CardTitle>
							<CardDescription>
								Upload an Excel file to automatically populate
								OKR data
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!uploadedFile ? (
								<div
									{...getRootProps()}
									className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
										isDragActive
											? 'border-primary bg-primary/5'
											: 'border-muted-foreground/25 hover:border-primary/50'
									}`}
								>
									<input {...getInputProps()} />
									<Upload className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
									<p className='text-lg font-medium mb-2'>
										{isDragActive
											? 'Drop the Excel file here'
											: 'Drag & drop an Excel file here'}
									</p>
									<p className='text-sm text-muted-foreground'>
										or click to select a file (.xlsx, .xls)
									</p>
								</div>
							) : (
								<div className='flex items-center justify-between p-4 bg-muted rounded-lg'>
									<div className='flex items-center space-x-3'>
										<FileSpreadsheet className='h-8 w-8 text-green-600' />
										<div>
											<p className='font-medium'>
												{uploadedFile.name}
											</p>
											<p className='text-sm text-muted-foreground'>
												File uploaded successfully
											</p>
										</div>
									</div>
									<Button
										onClick={removeUploadedFile}
										variant='outline'
										size='sm'
									>
										<X className='h-4 w-4' />
									</Button>
								</div>
							)}
						</CardContent>
					</Card>

					{/* OKR Form */}
					<Card>
						<CardHeader>
							<CardTitle>OKR Details</CardTitle>
						</CardHeader>
						<CardContent>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className='space-y-6'
								>
									<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
										<FormField
											control={form.control}
											name='title'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Title</FormLabel>
													<FormControl>
														<Input
															placeholder='Enter OKR title'
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<div className='grid grid-cols-2 gap-4'>
											<FormField
												control={form.control}
												name='quarter'
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															Quarter
														</FormLabel>
														<Select
															onValueChange={
																field.onChange
															}
															value={field.value}
														>
															<FormControl>
																<SelectTrigger>
																	<SelectValue placeholder='Select quarter' />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value='Q1'>
																	Q1
																</SelectItem>
																<SelectItem value='Q2'>
																	Q2
																</SelectItem>
																<SelectItem value='Q3'>
																	Q3
																</SelectItem>
																<SelectItem value='Q4'>
																	Q4
																</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name='year'
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															Year
														</FormLabel>
														<FormControl>
															<Input
																type='number'
																placeholder='2024'
																{...field}
																onChange={(e) =>
																	field.onChange(
																		Number(
																			e
																				.target
																				.value
																		)
																	)
																}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</div>

									<FormField
										control={form.control}
										name='description'
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Description (Optional)
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder='Provide additional context for this OKR'
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='objective'
										render={({ field }) => (
											<FormItem>
												<FormLabel>Objective</FormLabel>
												<FormControl>
													<Textarea
														placeholder='What do you want to achieve?'
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Key Results */}
									<div className='space-y-4'>
										<div className='flex items-center justify-between'>
											<h3 className='text-lg font-semibold'>
												Key Results
											</h3>
											<Button
												type='button'
												onClick={() =>
													append({
														description: '',
														target: '',
														current: '0',
													})
												}
												variant='outline'
												size='sm'
											>
												<Plus className='h-4 w-4 mr-2' />
												Add Key Result
											</Button>
										</div>

										{fields.map((field, index) => (
											<Card
												key={field.id}
												className='p-4'
											>
												<div className='flex items-start justify-between mb-4'>
													<Badge variant='secondary'>
														Key Result {index + 1}
													</Badge>
													{fields.length > 1 && (
														<Button
															type='button'
															onClick={() =>
																remove(index)
															}
															variant='outline'
															size='sm'
														>
															<X className='h-4 w-4' />
														</Button>
													)}
												</div>

												<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
													<div className='md:col-span-2'>
														<FormField
															control={
																form.control
															}
															name={`keyResults.${index}.description`}
															render={({
																field,
															}) => (
																<FormItem>
																	<FormLabel>
																		Description
																	</FormLabel>
																	<FormControl>
																		<Input
																			placeholder='Key result description'
																			{...field}
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													</div>

													<FormField
														control={form.control}
														name={`keyResults.${index}.target`}
														render={({ field }) => (
															<FormItem>
																<FormLabel>
																	Target
																</FormLabel>
																<FormControl>
																	<Input
																		type='number'
																		placeholder='Target value'
																		{...field}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</div>
											</Card>
										))}
									</div>

									<div className='flex justify-end space-x-4'>
										<Button
											type='button'
											onClick={() => navigate('/')}
											variant='outline'
										>
											Cancel
										</Button>
										<Button
											type='submit'
											disabled={isLoading}
										>
											{isLoading
												? 'Creating...'
												: 'Create OKR'}
										</Button>
									</div>
								</form>
							</Form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default NewOKR;
